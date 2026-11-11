class Solution {
    public String interleave(String s, String t) {
        StringBuilder r = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            r.append(s.charAt(i));
            r.append(t.charAt(i));
        }
        return r.toString();
    }
}
