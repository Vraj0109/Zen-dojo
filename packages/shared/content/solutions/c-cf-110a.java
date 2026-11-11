class Solution {
    public boolean nearlyLucky(String n) {
        int c = 0;
        for (int i = 0; i < n.length(); i++) {
            char ch = n.charAt(i);
            if (ch == '4' || ch == '7') c++;
        }
        if (c == 0) return false;
        while (c > 0) {
            int d = c % 10;
            if (d != 4 && d != 7) return false;
            c /= 10;
        }
        return true;
    }
}
