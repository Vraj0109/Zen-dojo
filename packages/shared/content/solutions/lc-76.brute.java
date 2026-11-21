class Solution {
    public String minWindow(String s, String t) {
        int n = s.length();
        int[] target = new int[128];
        for (char c : t.toCharArray()) target[c]++;

        String best = "";
        for (int i = 0; i < n; i++) {
            int[] cur = new int[128];
            for (int j = i; j < n; j++) {
                cur[s.charAt(j)]++;
                boolean ok = true;
                for (int c = 0; c < 128; c++) {
                    if (cur[c] < target[c]) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    if (best.isEmpty() || j - i + 1 < best.length()) {
                        best = s.substring(i, j + 1);
                    }
                    break;
                }
            }
        }
        return best;
    }
}
