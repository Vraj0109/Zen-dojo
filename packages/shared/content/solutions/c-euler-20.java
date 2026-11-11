import java.util.ArrayList;
import java.util.List;

class Solution {
    public int factorialDigitSum(int n) {
        long B = 1000000000L;
        List<Long> a = new ArrayList<>();
        a.add(1L);
        for (int k = 2; k <= n; k++) {
            long carry = 0;
            for (int i = 0; i < a.size(); i++) {
                long cur = a.get(i) * k + carry;
                a.set(i, cur % B);
                carry = cur / B;
            }
            while (carry > 0) {
                a.add(carry % B);
                carry /= B;
            }
        }
        int sum = 0;
        for (long x : a) {
            while (x > 0) {
                sum += x % 10;
                x /= 10;
            }
        }
        return sum;
    }
}
