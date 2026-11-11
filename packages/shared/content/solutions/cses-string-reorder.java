class Solution {
    private boolean ok(int[] cnt, int rem, int last) {
        if (rem == 0) return true;
        int mx = 0;
        for (int i = 0; i < 26; i++) mx = Math.max(mx, cnt[i]);
        if (mx > (rem + 1) / 2) return false;
        if (last >= 0 && cnt[last] > rem / 2) return false;
        return true;
    }

    public String stringReorder(String s) {
        int[] cnt = new int[26];
        for (int i = 0; i < s.length(); i++) cnt[s.charAt(i) - 'A']++;
        int n = s.length();
        if (!ok(cnt, n, -1)) return "-1";
        StringBuilder out = new StringBuilder();
        int last = -1;
        for (int pos = 0; pos < n; pos++) {
            for (int c = 0; c < 26; c++) {
                if (cnt[c] == 0 || c == last) continue;
                cnt[c]--;
                if (ok(cnt, n - pos - 1, c)) {
                    out.append((char) ('A' + c));
                    last = c;
                    break;
                }
                cnt[c]++;
            }
        }
        return out.toString();
    }
}
