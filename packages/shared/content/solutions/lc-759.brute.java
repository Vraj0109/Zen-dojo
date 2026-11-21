import java.util.*;

public class Solution {
    public int[][] employeeFreeTime(int[][] intervals) {
        if (intervals.length == 0) return new int[0][0];

        TreeSet<Integer> pointSet = new TreeSet<>();
        for (int[] iv : intervals) {
            pointSet.add(iv[0]);
            pointSet.add(iv[1]);
        }

        List<Integer> sortedPoints = new ArrayList<>(pointSet);
        List<int[]> res = new ArrayList<>();

        for (int i = 0; i + 1 < sortedPoints.size(); i++) {
            int start = sortedPoints.get(i);
            int end = sortedPoints.get(i + 1);
            if (start >= end) continue;

            boolean busy = false;
            for (int[] iv : intervals) {
                if (iv[0] <= start && iv[1] >= end) {
                    busy = true;
                    break;
                }
            }

            if (!busy) {
                if (!res.isEmpty() && res.get(res.size() - 1)[1] == start) {
                    res.get(res.size() - 1)[1] = end;
                } else {
                    res.add(new int[]{start, end});
                }
            }
        }

        return res.toArray(new int[0][]);
    }
}
