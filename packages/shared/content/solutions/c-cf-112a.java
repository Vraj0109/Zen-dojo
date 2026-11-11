class Solution {
    public int compareCaseInsensitive(String a, String b) {
        for (int i = 0; i < a.length(); i++) {
            char ca = Character.toLowerCase(a.charAt(i));
            char cb = Character.toLowerCase(b.charAt(i));
            if (ca < cb) return -1;
            if (ca > cb) return 1;
        }
        return 0;
    }
}
