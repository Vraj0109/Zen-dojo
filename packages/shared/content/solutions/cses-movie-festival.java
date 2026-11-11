import java.util.*;

class Solution {
    public int movieFestival(int[][] movies) {
        Arrays.sort(movies, (a, b) -> a[1] != b[1] ? Integer.compare(a[1], b[1]) : Integer.compare(a[0], b[0]));
        int count = 0;
        int lastEnd = 0;
        for (int[] m : movies) {
            if (m[0] >= lastEnd) {
                count++;
                lastEnd = m[1];
            }
        }
        return count;
    }
}
