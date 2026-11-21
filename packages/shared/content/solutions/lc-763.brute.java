import java.util.*;

class Solution {
    private boolean canSplit(String s, int i, int j) {
        boolean[] inSub = new boolean[26];
        for (int k = i; k <= j; k++) inSub[s.charAt(k) - 'a'] = true;
        for (int k = 0; k < s.length(); k++) {
            if (k < i || k > j) {
                if (inSub[s.charAt(k) - 'a']) return false;
            }
        }
        return true;
    }

    public int[] partitionLabels(String s) {
        List<Integer> res = new ArrayList<>();
        int n = s.length();
        int start = 0;
        while (start < n) {
            for (int end = start; end < n; end++) {
                if (canSplit(s, start, end)) {
                    res.add(end - start + 1);
                    start = end + 1;
                    break;
                }
            }
        }
        int[] ans = new int[res.size()];
        for (int i = 0; i < res.size(); i++) ans[i] = res.get(i);
        return ans;
    }
}
