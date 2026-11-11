import java.util.ArrayList;
import java.util.List;

class Solution {
    public int powerDigitSum(int exponent) {
        long BASE = 1000000000L;
        List<Long> limbs = new ArrayList<>();
        limbs.add(1L);
        for (int step = 0; step < exponent; step++) {
            long carry = 0;
            for (int i = 0; i < limbs.size(); i++) {
                long v = limbs.get(i) * 2 + carry;
                limbs.set(i, v % BASE);
                carry = v / BASE;
            }
            if (carry > 0) limbs.add(carry);
        }
        int sum = 0;
        for (long x : limbs) {
            while (x > 0) {
                sum += x % 10;
                x /= 10;
            }
        }
        return sum;
    }
}
