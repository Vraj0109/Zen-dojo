class Solution {
    public String stringTask(String s) {
        StringBuilder r = new StringBuilder();
        String vowels = "aoyeui";
        for (int i = 0; i < s.length(); i++) {
            char c = Character.toLowerCase(s.charAt(i));
            if (vowels.indexOf(c) != -1) continue;
            r.append('.');
            r.append(c);
        }
        return r.toString();
    }
}
