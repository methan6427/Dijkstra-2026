# Dijkstra Algorithm Project Implementation

This document details the algorithmic core of the Multi-Criteria Pathfinding application. The implementation focuses on efficiency and code separation, using **Dijkstra's Algorithm** to calculate optimal paths based on either **distance** or **time**.

## 1. Core Data Structures

To ensure efficient graph traversal, I utilized specific data structures optimized for sparse graphs.

### The Graph Representation (`Adjacency List`)
I chose an **Adjacency List** over an Adjacency Matrix because most transport networks are sparse (i.e., nodes have few connections relative to the total number of nodes).
- **Structure**: A `Map<string, Edge[]>` where each key is a Node ID and the value is a list of outgoing edges.
- **Edge Interface**:
  ```typescript
  interface Edge {
      to: string;       // The destination node
      distance: number; // Cost metric 1 (Physical length)
      time: number;     // Cost metric 2 (Travel time)
  }
  ```

### The Priority Queue (`MinHeap`)
A standard array would result in `O(N)` lookup time for the closest node, degrading the algorithm to `O(V^2)`. To achieve `O(E log V)` performance, I implemented a binary **Min-Heap**.

- **Function**: It maintains the set of "frontier" nodes, always keeping the node with the smallest tentative distance at the root.
- **Operations**:
  - `push(node, priority)`: Inserts a node and bubbles it up to restore heap property (`O(log N)`).
  - `pop()`: Extracts the minimum element and bubbles down the new root (`O(log N)`).

---

## 2. Algorithm Execution Flow

The `dijkstra` function encapsulates the core logic, decoupled from the React UI.

### Phase 1: Initialization
We start by initializing our state maps:
- `dist`: Stores the shortest known distance from the start node to every other node (initialized to infinity/undefined).
- `prev`: Tracks the path history (predecessor of each node) to reconstruct the route later.
- `visited`: A `Set` to keep track of finalized nodes.

### Phase 2: The Search Loop
The algorithm runs while the Priority Queue is not empty:
1.  **Extract Min**: We dequeue the node `u` with the smallest known cost.
2.  **Guard Clause**: If `u` is already in `visited`, we skip it (handling duplicate entries in the heap).
3.  **Visualization State**: We mark `u` as `visited`.
4.  **Target Optimization**: If `u` is the destination, we terminate early.

### Phase 3: Relaxation (Neighbor Inspection)
For each neighbor `v` of `u`:
- We calculate `alt = dist[u] + weight(u, v)`.
- If `alt` is strictly less than `dist[v]`, we have found a better path.
- **Update**: We update `dist[v]`, set `prev[v] = u`, and push `v` into the priority queue with the new priority.

### Phase 4: Path Reconstruction
After reaching the destination, we reconstruct the path by backtracking from the `end` node to the `start` node using the `prev` map.

---

## 3. Complexity Analysis

### Time Complexity: **O(E log V)**
- **V** = Number of Vertices (Nodes)
- **E** = Number of Edges
- We extract each vertex from the Min-Heap once (`log V`). in the worst case, we update the priority for every edge (`E * log V`). This is significantly faster than standard Bellman-Ford or array-based Dijkstra for our dataset size.

### Space Complexity: **O(V + E)**
- We store the entire graph structure (`V + E`).
- The `dist` and `prev` maps scale linearly with the number of nodes (`V`).

---

## 4. Architecture & Separation of Concerns

The project follows a strict separation between logic and presentation:
- **Algorithm Layer (`dijkstra` function)**: Pure logic. It accepts a graph and returns a path result. It has no dependency on the UI framework.
- **Data Layer**: The input parser converts raw text files into the structured `Adjacency List` format.
- **View Layer (React)**: The component handles user interaction (file upload, node selection) and renders the visual result. It treats the algorithm as a black-box utility.
