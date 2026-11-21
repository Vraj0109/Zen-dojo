class Solution {
    public boolean isValid(String s) {
        while (true) {
            int p1 = s.indexOf("()");
            int p2 = s.indexOf("[]");
            int p3 = s.indexOf("{}");
            if (p1 != -1) {
                s = s.substring(0, p1) + s.substring(p1 + 2);
            } else if (p2 != -1) {
                s = s.substring(0, p2) + s.substring(p2 + 2);
            } else if (p3 != -1) {
                s = s.substring(0, p3) + s.substring(p3 + 2);
            } else {
                break;
            }
        }
        return s.isEmpty();
    }
}
