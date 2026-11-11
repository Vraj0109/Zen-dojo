import java.util.*;

class Solution {
    public int[] findOrder(int numCourses, int[][] prerequisites) {
        List<Integer>[] g = new List[numCourses];
        for (int i = 0; i < numCourses; i++) g[i] = new ArrayList<>();
        int[] indeg = new int[numCourses];
        for (int[] p : prerequisites) {
            g[p[1]].add(p[0]);
            indeg[p[0]]++;
        }
        PriorityQueue<Integer> pq = new PriorityQueue<>();
        for (int i = 0; i < numCourses; i++) {
            if (indeg[i] == 0) pq.offer(i);
        }
        int[] order = new int[numCourses];
        int idx = 0;
        while (!pq.isEmpty()) {
            int u = pq.poll();
            order[idx++] = u;
            for (int v : g[u]) {
                if (--indeg[v] == 0) pq.offer(v);
            }
        }
        if (idx != numCourses) return new int[0];
        return order;
    }
}