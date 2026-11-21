class Solution {
    public String decodeString(String s) {
        while (true) {
            int closePos = s.indexOf(']');
            if (closePos == -1) break;
            int openPos = s.lastIndexOf('[', closePos);
            int numStart = openPos;
            while (numStart > 0 && Character.isDigit(s.charAt(numStart - 1))) {
                numStart--;
            }
            int k = Integer.parseInt(s.substring(numStart, openPos));
            String inner = s.substring(openPos + 1, closePos);
            StringBuilder rep = new StringBuilder();
            for (int i = 0; i < k; i++) rep.append(inner);
            s = s.substring(0, numStart) + rep.toString() + s.substring(closePos + 1);
        }
        return s;
    }
}
