class Solution {
    public int sevenWondersScore(String cards) {
        int t = 0, c = 0, g = 0;
        for (int i = 0; i < cards.length(); i++) {
            char ch = cards.charAt(i);
            if (ch == 'T') t++;
            else if (ch == 'C') c++;
            else g++;
        }
        return t * t + c * c + g * g + 7 * Math.min(t, Math.min(c, g));
    }
}
