class Solution {
    public String longNameInitials(String name) {
        StringBuilder r = new StringBuilder();
        for (int i = 0; i < name.length(); i++) {
            if (i == 0 || name.charAt(i - 1) == '-') {
                r.append(name.charAt(i));
            }
        }
        return r.toString();
    }
}
