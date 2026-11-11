class Solution {
    private boolean feasible(int[] cnt, int rem, int last) {
        if (rem == 0) return true;
        int mx = 0;
        for (int c : cnt) if (c > mx) mx = c;
        if (mx > (rem + 1) / 2) return false;
        if (last >= 0 && cnt[last] > rem / 2) return false;
        return true;
    }
    public String reorganizeString(String s) {
        int[] cnt = new int[26];
        for (int i = 0; i < s.length(); i++) cnt[s.charAt(i) - 'a']++;
        int n = s.length();
        if (!feasible(cnt, n, -1)) return "";
        StringBuilder out = new StringBuilder();
        int last = -1;
        for (int pos = 0; pos < n; pos++) {
            boolean placed = false;
            for (int c = 0; c < 26; c++) {
                if (cnt[c] == 0 || c == last) continue;
                cnt[c]--;
                if (feasible(cnt, n - pos - 1, c)) {
                    out.append((char) ('a' + c));
                    last = c;
                    placed = true;
                    break;
                }
                cnt[c]++;
            }
            if (!placed) return "";
        }
        return out.toString();
    }
}