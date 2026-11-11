class Solution {
    public String checkHalloween(String month, int day) {
        if ((month.equals("OCT") && day == 31) || (month.equals("DEC") && day == 25)) {
            return "yup";
        }
        return "nope";
    }
}
