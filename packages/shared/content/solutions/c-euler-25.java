import java.util.ArrayList;
import java.util.List;

class Solution {
    public int firstFibWithDigits(int d) {
        if (d <= 1) return 1;
        List<Integer> a = new ArrayList<>();
        List<Integer> b = new ArrayList<>();
        a.add(1);
        b.add(1);
        int k = 2;
        while (b.size() < d) {
            List<Integer> c = new ArrayList<>();
            int carry = 0;
            for (int i = 0; i < b.size(); i++) {
                int s = b.get(i) + (i < a.size() ? a.get(i) : 0) + carry;
                c.add(s % 10);
                carry = s / 10;
            }
            if (carry > 0) c.add(carry);
            a = b;
            b = c;
            k++;
        }
        return k;
    }
}
