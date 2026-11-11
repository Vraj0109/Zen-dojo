import java.util.*;

class Solution {
    public int[][] reconstructQueue(int[][] people) {
        Arrays.sort(people, (a, b) -> a[0] != b[0] ? Integer.compare(b[0], a[0]) : Integer.compare(a[1], b[1]));
        List<int[]> out = new ArrayList<>();
        for (int[] p : people) {
            out.add(p[1], p);
        }
        return out.toArray(new int[people.length][]);
    }
}