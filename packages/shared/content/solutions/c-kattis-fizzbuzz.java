import java.util.ArrayList;
import java.util.List;

class Solution {
    public String[] generateFizzBuzz(int x, int y, int n) {
        String[] ans = new String[n];
        for (int i = 1; i <= n; i++) {
            boolean fx = (i % x == 0);
            boolean fy = (i % y == 0);
            if (fx && fy) ans[i - 1] = "FizzBuzz";
            else if (fx) ans[i - 1] = "Fizz";
            else if (fy) ans[i - 1] = "Buzz";
            else ans[i - 1] = Integer.toString(i);
        }
        return ans;
    }
}
