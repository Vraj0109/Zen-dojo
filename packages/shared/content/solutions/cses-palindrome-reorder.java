class Solution {
    public String palindromeReorder(String s) {
        int[] cnt = new int[26];
        for (int i = 0; i < s.length(); i++) cnt[s.charAt(i) - 'A']++;
        int odd = -1, oddCount = 0;
        for (int i = 0; i < 26; i++) {
            if (cnt[i] % 2 != 0) {
                odd = i;
                oddCount++;
            }
        }
        if (oddCount > 1) return "NO SOLUTION";
        StringBuilder half = new StringBuilder();
        for (int i = 0; i < 26; i++) {
            for (int k = 0; k < cnt[i] / 2; k++) {
                half.append((char) ('A' + i));
            }
        }
        String mid = odd >= 0 ? String.valueOf((char) ('A' + odd)) : "";
        String rev = new StringBuilder(half).reverse().toString();
        return half.toString() + mid + rev;
    }
}
