import java.util.ArrayList;
import java.util.List;

class Solution {
    private static boolean pal(long v, int base) {
        List<Integer> d = new ArrayList<>();
        while (v > 0) {
            d.add((int)(v % base));
            v /= base;
        }
        for (int i = 0, j = d.size(); i + 1 < j; i++, j--) {
            if (!d.get(i).equals(d.get(j - 1))) return false;
        }
        return true;
    }

    public long doubleBasePalindromes(int limit, int base) {
        long total = 0;
        for (long h = 1; h <= 99999; h++) {
            for (int odd = 0; odd < 2; odd++) {
                long v = h;
                long t = (odd == 1) ? h / 10 : h;
                while (t > 0) {
                    v = v * 10 + t % 10;
                    t /= 10;
                }
                if (v < limit && pal(v, base)) total += v;
            }
        }
        return total;
    }
}
