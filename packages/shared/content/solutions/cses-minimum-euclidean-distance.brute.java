import java.util.*;

public class Solution {
    public long minimumEuclideanDistance(int[][] points) {
        int n = points.length;
        long minD = Long.MAX_VALUE;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                long dx = points[i][0] - points[j][0];
                long dy = points[i][1] - points[j][1];
                long d = dx * dx + dy * dy;
                if (d < minD) minD = d;
            }
        }
        return minD;
    }
}
