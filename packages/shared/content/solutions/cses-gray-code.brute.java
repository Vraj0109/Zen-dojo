import java.util.*;

class Solution {
    public String[] grayCode(int n) {
        if (n == 1) return new String[]{"0", "1"};
        String[] prev = grayCode(n - 1);
        String[] out = new String[prev.length * 2];
        for (int i = 0; i < prev.length; i++) {
            out[i] = "0" + prev[i];
            out[out.length - 1 - i] = "1" + prev[i];
        }
        return out;
    }
}
