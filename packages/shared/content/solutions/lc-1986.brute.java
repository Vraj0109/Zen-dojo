import java.util.*;

class Solution {
    private int minSessions;

    private void backtrack(int[] tasks, int idx, List<Integer> sessions, int sessionTime) {
        if (sessions.size() >= minSessions) return;
        if (idx == tasks.length) {
            minSessions = Math.min(minSessions, sessions.size());
            return;
        }

        for (int i = 0; i < sessions.size(); i++) {
            if (sessions.get(i) + tasks[idx] <= sessionTime) {
                sessions.set(i, sessions.get(i) + tasks[idx]);
                backtrack(tasks, idx + 1, sessions, sessionTime);
                sessions.set(i, sessions.get(i) - tasks[idx]);
            }
        }

        sessions.add(tasks[idx]);
        backtrack(tasks, idx + 1, sessions, sessionTime);
        sessions.remove(sessions.size() - 1);
    }

    public int minSessions(int[] tasks, int sessionTime) {
        minSessions = tasks.length;
        Arrays.sort(tasks);
        for (int i = 0, j = tasks.length - 1; i < j; i++, j--) {
            int tmp = tasks[i];
            tasks[i] = tasks[j];
            tasks[j] = tmp;
        }
        backtrack(tasks, 0, new ArrayList<>(), sessionTime);
        return minSessions;
    }
}
