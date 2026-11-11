class Solution {
    public String describeMoose(int left, int right) {
        if (left == 0 && right == 0) return "Not a moose";
        if (left == right) return "Even " + (left * 2);
        return "Odd " + (Math.max(left, right) * 2);
    }
}
