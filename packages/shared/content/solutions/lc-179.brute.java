import java.util.*;

class Solution {
    private String best = "";

    private void permute(String[] s, int idx) {
        if (idx == s.length) {
            StringBuilder sb = new StringBuilder();
            for (String str : s) sb.append(str);
            String cand = sb.toString();
            if (best.isEmpty() || cand.compareTo(best) > 0) {
                best = cand;
            }
            return;
        }
        for (int i = idx; i < s.length; i++) {
            String temp = s[idx];
            s[idx] = s[i];
            s[i] = temp;
            permute(s, idx + 1);
            temp = s[idx];
            s[idx] = s[i];
            s[i] = temp;
        }
    }

    public String largestNumber(int[] nums) {
        String[] s = new String[nums.length];
        for (int i = 0; i < nums.length; i++) s[i] = String.valueOf(nums[i]);
        best = "";
        permute(s, 0);
        if (!best.isEmpty() && best.charAt(0) == '0') return "0";
        return best;
    }
}
