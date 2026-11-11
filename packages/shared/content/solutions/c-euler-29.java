import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

class Solution {
    private static class Pair {
        int r, kb;
        Pair(int r, int kb) {
            this.r = r;
            this.kb = kb;
        }
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Pair p = (Pair) o;
            return r == p.r && kb == p.kb;
        }
        @Override
        public int hashCode() {
            return Objects.hash(r, kb);
        }
    }

    public int distinctPowers(int n) {
        Set<Pair> seen = new HashSet<>();
        for (int a = 2; a <= n; a++) {
            int r = a;
            int k = 1;
            for (int base = 2; base * base <= a; base++) {
                long x = base;
                int e = 1;
                while (x < a) {
                    x *= base;
                    e++;
                }
                if (x == a) {
                    r = base;
                    k = e;
                    break;
                }
            }
            for (int b = 2; b <= n; b++) {
                seen.add(new Pair(r, k * b));
            }
        }
        return seen.size();
    }
}
