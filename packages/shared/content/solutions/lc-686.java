class Solution {
    public int repeatedStringMatch(String a, String b) {
        int k = (b.length() + a.length() - 1) / a.length();
        StringBuilder s = new StringBuilder();
        for (int i = 0; i < k; i++) s.append(a);
        if (s.indexOf(b) != -1) return k;
        s.append(a);
        if (s.indexOf(b) != -1) return k + 1;
        return -1;
    }
}