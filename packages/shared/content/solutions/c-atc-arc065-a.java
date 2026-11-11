class Solution {
    public boolean isDaydream(String s) {
        String[] words = {"dream", "dreamer", "erase", "eraser"};
        int n = s.length();
        boolean[] ok = new boolean[n + 1];
        ok[0] = true;
        for (int i = 1; i <= n; i++) {
            for (String w : words) {
                int len = w.length();
                if (i >= len && ok[i - len] && s.startsWith(w, i - len)) {
                    ok[i] = true;
                }
            }
        }
        return ok[n];
    }
}
