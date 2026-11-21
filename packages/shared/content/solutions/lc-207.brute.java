import java.util.*;

class Solution {
    private boolean hasCycleDFS(int u, List<List<Integer>> g, int[] state) {
        state[u] = 1;
        for (int v : g.get(u)) {
            if (state[v] == 1) return true;
            if (state[v] == 0 && hasCycleDFS(v, g, state)) return true;
        }
        state[u] = 2;
        return false;
    }

    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) g.add(new ArrayList<>());
        for (int[] p : prerequisites) {
            g.get(p[1]).add(p[0]);
        }
        int[] state = new int[numCourses];
        for (int i = 0; i < numCourses; i++) {
            if (state[i] == 0) {
                if (hasCycleDFS(i, g, state)) return false;
            }
        }
        return true;
    }
}
