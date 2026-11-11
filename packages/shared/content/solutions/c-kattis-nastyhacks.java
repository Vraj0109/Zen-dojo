class Solution {
    public String nastyHacksDecision(int r, int e, int c) {
        int net = e - c;
        if (net > r) return "advertise";
        if (net == r) return "does not matter";
        return "do not advertise";
    }
}
