use std::collections::HashMap;

use crate::graph::AdGraph;
use crate::types::{ClusterCountMode, ClusterOptions};

/// Result of clustering: node→cluster assignment and cluster membership lists.
pub struct ClusterAssignment {
    /// node_id → cluster index (0-based)
    pub assignments: HashMap<String, usize>,
    /// cluster index → list of node_ids
    pub clusters: Vec<Vec<String>>,
    /// Number of clusters
    pub k: usize,
}

/// Partition graph nodes into clusters using spectral analysis or module grouping.
pub fn spectral_cluster(graph: &AdGraph, opts: &ClusterOptions) -> ClusterAssignment {
    let node_ids: Vec<String> = {
        let mut ids = graph.node_ids();
        ids.sort(); // deterministic ordering
        ids
    };
    let n = node_ids.len();

    if n == 0 {
        return ClusterAssignment {
            assignments: HashMap::new(),
            clusters: vec![],
            k: 0,
        };
    }

    // Hybrid mode: use modules directly as clusters
    if opts.hybrid_modules {
        let mut result = module_based_clustering(graph, &node_ids);
        merge_small_clusters(&mut result, opts.min_cluster_size);
        return result;
    }

    if n <= 2 {
        return single_cluster(&node_ids);
    }

    // Build id → index mapping
    let id_to_idx: HashMap<&str, usize> = node_ids
        .iter()
        .enumerate()
        .map(|(i, id)| (id.as_str(), i))
        .collect();

    // Build symmetric adjacency matrix (treat directed graph as undirected)
    let mut adj = vec![vec![0.0f64; n]; n];
    for edge in graph.edges() {
        if let (Some(&i), Some(&j)) = (
            id_to_idx.get(edge.source.as_str()),
            id_to_idx.get(edge.target.as_str()),
        ) {
            let w = edge.weight;
            adj[i][j] += w;
            adj[j][i] += w;
        }
    }

    // Build graph Laplacian: L = D - A
    let mut laplacian = vec![vec![0.0f64; n]; n];
    for i in 0..n {
        let degree: f64 = adj[i].iter().sum();
        laplacian[i][i] = degree;
        for j in 0..n {
            laplacian[i][j] -= adj[i][j];
        }
    }

    // Determine target number of clusters
    let max_k = determine_max_k(graph, &node_ids, opts, n);

    // We need max_k + 1 eigenvectors (first is trivial)
    let num_eigvecs = (max_k + 1).min(n);

    // Estimate largest eigenvalue of L for the shift trick
    let lambda_max = estimate_largest_eigenvalue(&laplacian, n);

    if lambda_max < 1e-10 {
        // Graph has no edges; fall back to module-based or single cluster
        let mut result = module_based_clustering(graph, &node_ids);
        merge_small_clusters(&mut result, opts.min_cluster_size);
        return result;
    }

    // Shifted matrix: M = λ_max * I - L
    // Largest eigenvectors of M correspond to smallest eigenvalues of L
    let mut shifted = vec![vec![0.0f64; n]; n];
    for i in 0..n {
        for j in 0..n {
            shifted[i][j] = -laplacian[i][j];
        }
        shifted[i][i] += lambda_max;
    }

    // Find top eigenvectors via power iteration with orthogonalization
    let eigenpairs = find_eigenvectors(&shifted, n, num_eigvecs, 100);

    // Convert eigenvalues of M back to eigenvalues of L: λ_L = λ_max - μ_M
    // eigenpairs[0] has largest μ_M → smallest λ_L (≈ 0, trivial)
    let eigenvalues_l: Vec<f64> = eigenpairs.iter().map(|(_, mu)| lambda_max - mu).collect();

    // Determine actual k
    let k = match opts.count_mode {
        ClusterCountMode::Auto => eigengap_k(&eigenvalues_l, max_k),
        ClusterCountMode::Fixed => opts.cluster_count.unwrap_or(max_k).min(n),
        ClusterCountMode::ModuleCount => max_k.min(n),
    };

    let k = k.max(2).min(n);

    // Build spectral embedding: n × (k-1) matrix using eigenvectors 1..k
    // (skip eigenvector 0 which is the trivial constant vector)
    let embed_dim = k.min(eigenpairs.len().saturating_sub(1));
    if embed_dim == 0 {
        return single_cluster(&node_ids);
    }

    let embedding: Vec<Vec<f64>> = (0..n)
        .map(|i| {
            (1..=embed_dim)
                .map(|d| {
                    if d < eigenpairs.len() {
                        eigenpairs[d].0[i]
                    } else {
                        0.0
                    }
                })
                .collect()
        })
        .collect();

    // K-means clustering on the spectral embedding
    let labels = kmeans(&embedding, k, 50);

    // Build result, removing empty clusters and renumbering
    let mut clusters: Vec<Vec<String>> = (0..k).map(|_| Vec::new()).collect();
    for (i, &label) in labels.iter().enumerate() {
        if label < clusters.len() {
            clusters[label].push(node_ids[i].clone());
        }
    }
    clusters.retain(|c| !c.is_empty());

    let mut assignments = HashMap::new();
    for (cluster_idx, cluster) in clusters.iter().enumerate() {
        for id in cluster {
            assignments.insert(id.clone(), cluster_idx);
        }
    }
    let k_actual = clusters.len();

    let mut result = ClusterAssignment {
        assignments,
        clusters,
        k: k_actual,
    };
    merge_small_clusters(&mut result, opts.min_cluster_size);
    result
}

/// Determine the maximum number of clusters based on the count mode.
fn determine_max_k(
    graph: &AdGraph,
    node_ids: &[String],
    opts: &ClusterOptions,
    n: usize,
) -> usize {
    match opts.count_mode {
        ClusterCountMode::Fixed => opts.cluster_count.unwrap_or(10).min(n),
        ClusterCountMode::ModuleCount => {
            let mut modules = std::collections::HashSet::new();
            for id in node_ids {
                if let Some(node) = graph.node(id) {
                    modules.insert(node.module_id.as_str());
                }
            }
            modules.len().max(2)
        }
        ClusterCountMode::Auto => {
            // Search up to sqrt(n) + a few extra for eigengap detection
            let target = ((n as f64).sqrt().ceil() as usize).max(3);
            (target + 3).min(n)
        }
    }
}

/// Auto-detect k via eigengap heuristic.
/// eigenvalues_l are sorted: λ_1 ≈ 0, λ_2 (Fiedler), λ_3, ...
/// Choose k at the largest gap in [λ_2, λ_3, ..., λ_max_k].
fn eigengap_k(eigenvalues_l: &[f64], max_k: usize) -> usize {
    if eigenvalues_l.len() < 3 {
        return 2;
    }

    let upper = eigenvalues_l.len().min(max_k + 1);
    let mut best_gap = 0.0f64;
    let mut best_k = 2;

    // Look at gaps between consecutive eigenvalues, starting from index 1
    for i in 1..upper.saturating_sub(1) {
        let gap = eigenvalues_l[i + 1] - eigenvalues_l[i];
        if gap > best_gap {
            best_gap = gap;
            best_k = i + 1; // k = number of clusters = index of the gap + 1
        }
    }

    best_k.max(2)
}

/// Module-based clustering: each module becomes a cluster.
fn module_based_clustering(graph: &AdGraph, node_ids: &[String]) -> ClusterAssignment {
    let mut module_to_cluster: HashMap<String, usize> = HashMap::new();
    let mut clusters: Vec<Vec<String>> = Vec::new();
    let mut assignments = HashMap::new();

    // Sort modules deterministically
    let mut module_order: Vec<String> = Vec::new();
    for id in node_ids {
        if let Some(node) = graph.node(id) {
            if !module_to_cluster.contains_key(&node.module_id) {
                module_to_cluster.insert(node.module_id.clone(), module_order.len());
                module_order.push(node.module_id.clone());
                clusters.push(Vec::new());
            }
        }
    }

    for id in node_ids {
        if let Some(node) = graph.node(id) {
            if let Some(&idx) = module_to_cluster.get(&node.module_id) {
                clusters[idx].push(id.clone());
                assignments.insert(id.clone(), idx);
            }
        }
    }

    let k = clusters.len();
    ClusterAssignment {
        assignments,
        clusters,
        k,
    }
}

/// Put all nodes in a single cluster.
fn single_cluster(node_ids: &[String]) -> ClusterAssignment {
    let assignments: HashMap<String, usize> = node_ids.iter().map(|id| (id.clone(), 0)).collect();
    ClusterAssignment {
        assignments,
        clusters: vec![node_ids.to_vec()],
        k: 1,
    }
}

/// Merge clusters smaller than min_size into their nearest neighbor cluster.
fn merge_small_clusters(result: &mut ClusterAssignment, min_size: usize) {
    if min_size <= 1 || result.k <= 1 {
        return;
    }

    let mut changed = true;
    while changed {
        changed = false;
        let small_idx = result.clusters.iter().position(|c| !c.is_empty() && c.len() < min_size);
        if let Some(idx) = small_idx {
            // Find nearest non-small cluster (just pick the largest for simplicity)
            let target = result
                .clusters
                .iter()
                .enumerate()
                .filter(|(i, c)| *i != idx && !c.is_empty())
                .max_by_key(|(_, c)| c.len())
                .map(|(i, _)| i);

            if let Some(target_idx) = target {
                let nodes: Vec<String> = result.clusters[idx].drain(..).collect();
                for id in &nodes {
                    result.assignments.insert(id.clone(), target_idx);
                }
                result.clusters[target_idx].extend(nodes);
                changed = true;
            }
        }
    }

    // Remove empty clusters and renumber
    result.clusters.retain(|c| !c.is_empty());
    result.k = result.clusters.len();
    result.assignments.clear();
    for (idx, cluster) in result.clusters.iter().enumerate() {
        for id in cluster {
            result.assignments.insert(id.clone(), idx);
        }
    }
}

// ── Spectral linear algebra ──────────────────────────────────────────────

/// Estimate largest eigenvalue of a symmetric matrix via power iteration.
fn estimate_largest_eigenvalue(matrix: &[Vec<f64>], n: usize) -> f64 {
    let mut v: Vec<f64> = vec![1.0 / (n as f64).sqrt(); n];
    let mut eigenvalue = 0.0;

    for _ in 0..60 {
        let w = mat_vec_mul(matrix, &v, n);
        eigenvalue = dot(&w, &v, n);
        let norm = vec_norm(&w, n);
        if norm < 1e-14 {
            break;
        }
        v = w.iter().map(|x| x / norm).collect();
    }

    // Slight overestimate ensures the shifted matrix is positive semi-definite
    eigenvalue.abs() * 1.05 + 1.0
}

/// Find top k eigenvectors of a symmetric matrix via power iteration with
/// Gram-Schmidt orthogonalization (deflation without modifying the matrix).
fn find_eigenvectors(
    matrix: &[Vec<f64>],
    n: usize,
    k: usize,
    max_iter: usize,
) -> Vec<(Vec<f64>, f64)> {
    let mut eigenpairs: Vec<(Vec<f64>, f64)> = Vec::with_capacity(k);

    for eigen_idx in 0..k {
        // Deterministic pseudo-random initial vector (different seed per eigenvector)
        let mut v: Vec<f64> = (0..n)
            .map(|i| {
                let hash = i
                    .wrapping_mul(2654435761)
                    .wrapping_add(eigen_idx.wrapping_mul(2246822519));
                (hash % 10007) as f64 / 10007.0 - 0.5
            })
            .collect();
        normalize_vec(&mut v, n);

        let mut eigenvalue = 0.0;

        for _ in 0..max_iter {
            // w = M * v
            let mut w = mat_vec_mul(matrix, &v, n);

            // Orthogonalize against all previous eigenvectors (Gram-Schmidt)
            for (prev_v, _) in &eigenpairs {
                let proj = dot(&w, prev_v, n);
                for i in 0..n {
                    w[i] -= proj * prev_v[i];
                }
            }

            // Rayleigh quotient for eigenvalue estimate
            let new_eigenvalue = dot(&w, &v, n);

            // Normalize
            let norm = vec_norm(&w, n);
            if norm < 1e-14 {
                break;
            }
            for i in 0..n {
                w[i] /= norm;
            }

            // Check convergence
            let delta = (new_eigenvalue - eigenvalue).abs();
            eigenvalue = new_eigenvalue;
            v = w;

            if delta < 1e-10 {
                break;
            }
        }

        eigenpairs.push((v, eigenvalue));
    }

    eigenpairs
}

/// K-means clustering on spectral embedding vectors.
fn kmeans(data: &[Vec<f64>], k: usize, max_iter: usize) -> Vec<usize> {
    let n = data.len();
    if n == 0 || k == 0 {
        return vec![];
    }
    if k >= n {
        return (0..n).collect();
    }

    let dim = data[0].len();

    // Initialize centroids: evenly spaced points from the data
    let mut centroids: Vec<Vec<f64>> = (0..k)
        .map(|i| {
            let idx = (i * n) / k;
            data[idx].clone()
        })
        .collect();

    let mut labels = vec![0usize; n];

    for _ in 0..max_iter {
        let mut changed = false;

        // Assign each point to nearest centroid
        for i in 0..n {
            let mut best = 0;
            let mut best_dist = f64::MAX;
            for (c, centroid) in centroids.iter().enumerate() {
                let dist: f64 = (0..dim).map(|d| (data[i][d] - centroid[d]).powi(2)).sum();
                if dist < best_dist {
                    best_dist = dist;
                    best = c;
                }
            }
            if labels[i] != best {
                labels[i] = best;
                changed = true;
            }
        }

        if !changed {
            break;
        }

        // Update centroids
        let mut counts = vec![0usize; k];
        let mut sums: Vec<Vec<f64>> = (0..k).map(|_| vec![0.0; dim]).collect();

        for i in 0..n {
            let c = labels[i];
            counts[c] += 1;
            for d in 0..dim {
                sums[c][d] += data[i][d];
            }
        }

        for c in 0..k {
            if counts[c] > 0 {
                for d in 0..dim {
                    centroids[c][d] = sums[c][d] / counts[c] as f64;
                }
            }
        }
    }

    labels
}

// ── Vector/matrix helpers ────────────────────────────────────────────────

fn mat_vec_mul(matrix: &[Vec<f64>], v: &[f64], n: usize) -> Vec<f64> {
    let mut result = vec![0.0; n];
    for i in 0..n {
        let row = &matrix[i];
        let mut sum = 0.0;
        for j in 0..n {
            sum += row[j] * v[j];
        }
        result[i] = sum;
    }
    result
}

fn dot(a: &[f64], b: &[f64], n: usize) -> f64 {
    let mut sum = 0.0;
    for i in 0..n {
        sum += a[i] * b[i];
    }
    sum
}

fn vec_norm(v: &[f64], n: usize) -> f64 {
    dot(v, v, n).sqrt()
}

fn normalize_vec(v: &mut [f64], n: usize) {
    let norm = vec_norm(v, n);
    if norm > 1e-14 {
        for i in 0..n {
            v[i] /= norm;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_two_disconnected_clusters() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "C"},
                {"id": "d", "label": "D", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "D"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "c", "target": "d", "relation": "increases", "moduleId": "M02"}
            ]
        }"#,
        )
        .unwrap();

        let opts = ClusterOptions {
            count_mode: ClusterCountMode::Auto,
            min_cluster_size: 1,
            ..ClusterOptions::default()
        };
        let result = spectral_cluster(&g, &opts);
        assert!(result.k >= 2, "Expected at least 2 clusters, got {}", result.k);
        // a and b should be in the same cluster
        assert_eq!(result.assignments["a"], result.assignments["b"]);
        // c and d should be in the same cluster
        assert_eq!(result.assignments["c"], result.assignments["d"]);
        // a and c should be in different clusters
        assert_ne!(result.assignments["a"], result.assignments["c"]);
    }

    #[test]
    fn test_module_based_clustering() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "C"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "b", "target": "c", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        let opts = ClusterOptions {
            hybrid_modules: true,
            min_cluster_size: 1,
            ..ClusterOptions::default()
        };
        let result = spectral_cluster(&g, &opts);
        assert_eq!(result.k, 2);
        assert_eq!(result.assignments["a"], result.assignments["b"]);
        assert_ne!(result.assignments["a"], result.assignments["c"]);
    }

    #[test]
    fn test_fixed_cluster_count() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "C"},
                {"id": "d", "label": "D", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "D"},
                {"id": "e", "label": "E", "category": "STOCK", "subtype": "X", "moduleId": "M03", "description": "E"},
                {"id": "f", "label": "F", "category": "STOCK", "subtype": "X", "moduleId": "M03", "description": "F"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "c", "target": "d", "relation": "increases", "moduleId": "M02"},
                {"id": "e3", "source": "e", "target": "f", "relation": "increases", "moduleId": "M03"},
                {"id": "e4", "source": "b", "target": "c", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        let opts = ClusterOptions {
            count_mode: ClusterCountMode::Fixed,
            cluster_count: Some(3),
            min_cluster_size: 1,
            ..ClusterOptions::default()
        };
        let result = spectral_cluster(&g, &opts);
        // Should produce at most 3 clusters
        assert!(result.k <= 3);
        assert!(result.k >= 2);
    }

    #[test]
    fn test_merge_small_clusters() {
        let mut result = ClusterAssignment {
            assignments: [("a", 0), ("b", 1), ("c", 2), ("d", 2)]
                .iter()
                .map(|(k, v)| (k.to_string(), *v))
                .collect(),
            clusters: vec![
                vec!["a".to_string()],
                vec!["b".to_string()],
                vec!["c".to_string(), "d".to_string()],
            ],
            k: 3,
        };

        merge_small_clusters(&mut result, 2);

        // Singletons should be merged into the largest cluster
        assert!(result.k <= 2);
        // c and d should still be together
        assert_eq!(result.assignments["c"], result.assignments["d"]);
    }

    #[test]
    fn test_eigengap() {
        // Eigenvalues: 0.0, 0.1, 0.2, 0.9, 1.0
        // Gap at index 2→3: 0.7 (largest)
        // So k should be 3
        let eigenvalues = vec![0.0, 0.1, 0.2, 0.9, 1.0];
        let k = eigengap_k(&eigenvalues, 5);
        assert_eq!(k, 3);
    }
}
