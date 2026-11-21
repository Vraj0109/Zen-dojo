import java.util.Arrays;

class Solution {
    public int movieFestival(int[][] movies) {
        Arrays.sort(movies, (a, b) -> Integer.compare(a[1], b[1]));
        int count = 0, lastEnd = 0;
        for (int[] m : movies) {
            if (m[0] >= lastEnd) {
                count++;
                lastEnd = m[1];
            }
        }
        return count;
    }
}
