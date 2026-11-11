import java.util.*;

class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<Integer>[] g = new List[numCourses];
        for (int i = 0; i < numCourses; i++) g[i] = new ArrayList<>();
        int[] indeg = new int[numCourses];
        for (int[] p : prerequisites) {
            g[p[1]].add(p[0]);
            indeg[p[0]]++;
        }
        Queue<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < numCourses; i++) {
            if (indeg[i] == 0) q.offer(i);
        }
        int taken = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            taken++;
            for (int v : g[u]) {
                if (--indeg[v] == 0) q.offer(v);
            }
        }
        return taken == numCourses;
    }
}