import java.util.*;

class Solution {
    public String[] grayCode(int n) {
        String[] out = new String[1 << n];
        for (int i = 0; i < (1 << n); i++) {
            int g = i ^ (i >> 1);
            StringBuilder sb = new StringBuilder();
            for (int b = n - 1; b >= 0; b--) {
                sb.append((char) ('0' + ((g >> b) & 1)));
            }
            out[i] = sb.toString();
        }
        return out;
    }
}
