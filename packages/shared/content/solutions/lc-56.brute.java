import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

class Solution {
    public int[][] merge(int[][] intervals) {
        List<int[]> res = new ArrayList<>();
        for (int[] iv : intervals) {
            res.add(new int[]{iv[0], iv[1]});
        }
        boolean merged = true;
        while (merged) {
            merged = false;
            for (int i = 0; i < res.size(); i++) {
                for (int j = i + 1; j < res.size(); j++) {
                    int[] a = res.get(i);
                    int[] b = res.get(j);
                    if (Math.max(a[0], b[0]) <= Math.min(a[1], b[1])) {
                        a[0] = Math.min(a[0], b[0]);
                        a[1] = Math.max(a[1], b[1]);
                        res.remove(j);
                        merged = true;
                        break;
                    }
                }
                if (merged) break;
            }
        }
        res.sort(Comparator.comparingInt(a -> a[0]));
        return res.toArray(new int[0][]);
    }
}
