class Solution {
    public int strStr(String haystack, String needle) {
        int n = haystack.length(), m = needle.length();
        int[] fail = new int[m];
        for (int i = 1, k = 0; i < m; i++) {
            while (k > 0 && needle.charAt(i) != needle.charAt(k)) k = fail[k - 1];
            if (needle.charAt(i) == needle.charAt(k)) k++;
            fail[i] = k;
        }
        for (int i = 0, j = 0; i < n; i++) {
            while (j > 0 && haystack.charAt(i) != needle.charAt(j)) j = fail[j - 1];
            if (haystack.charAt(i) == needle.charAt(j)) j++;
            if (j == m) return i - m + 1;
        }
        return -1;
    }
}