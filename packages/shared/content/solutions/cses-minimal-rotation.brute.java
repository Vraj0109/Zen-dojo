import java.util.*;

public class Solution {
    public String minimalRotation(String s) {
        int n = s.length();
        String best = s;
        for (int i = 1; i < n; i++) {
            String rot = s.substring(i) + s.substring(0, i);
            if (rot.compareTo(best) < 0) {
                best = rot;
            }
        }
        return best;
    }
}
