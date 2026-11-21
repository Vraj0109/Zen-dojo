import java.util.Arrays;

class Solution {
    public long tasksAndDeadlines(int[][] tasks) {
        Arrays.sort(tasks, (a, b) -> Integer.compare(a[0], b[0]));
        long currentTime = 0;
        long totalReward = 0;
        for (int[] task : tasks) {
            currentTime += task[0];
            totalReward += (task[1] - currentTime);
        }
        return totalReward;
    }
}
