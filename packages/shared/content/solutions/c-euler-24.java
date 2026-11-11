import java.util.ArrayList;
import java.util.List;

class Solution {
    public String kthPermutation(int n, int k) {
        int[] fact = new int[n + 1];
        fact[0] = 1;
        for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i;
        List<Character> digits = new ArrayList<>();
        for (int i = 0; i < n; i++) digits.add((char)('0' + i));
        k--;
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < n; i++) {
            int f = fact[n - 1 - i];
            int idx = k / f;
            out.append(digits.get(idx));
            digits.remove(idx);
            k %= f;
        }
        return out.toString();
    }
}
