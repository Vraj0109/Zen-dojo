import java.util.*;

class Solution {
    public int findMinArrowShots(int[][] points) {
        Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));
        int arrows = 1;
        long pos = points[0][1];
        for (int[] p : points) {
            if (p[0] > pos) {
                arrows++;
                pos = p[1];
            }
        }
        return arrows;
    }
}