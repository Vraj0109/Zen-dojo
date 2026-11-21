#include <bits/stdc++.h>
using namespace std;

class Solution {
    int evaluateSimple(const string& s) {
        vector<long long> nums;
        vector<char> ops;
        long long cur = 0;
        char sign = '+';
        for (size_t i = 0; i < s.size(); i++) {
            char c = s[i];
            if (isdigit(c)) {
                cur = cur * 10 + (c - '0');
            }
            if ((!isdigit(c) && c != ' ') || i + 1 == s.size()) {
                if (sign == '+') nums.push_back(cur);
                else if (sign == '-') nums.push_back(-cur);
                else if (sign == '*') {
                    long long top = nums.back();
                    nums.pop_back();
                    nums.push_back(top * cur);
                } else if (sign == '/') {
                    long long top = nums.back();
                    nums.pop_back();
                    nums.push_back(top / cur);
                }
                sign = c;
                cur = 0;
            }
        }
        long long res = 0;
        for (long long x : nums) res += x;
        return (int)res;
    }
public:
    int calculate(string s) {
        while (true) {
            int right = -1;
            for (size_t i = 0; i < s.size(); i++) {
                if (s[i] == ')') {
                    right = (int)i;
                    break;
                }
            }
            if (right == -1) break;
            int left = right;
            while (left >= 0 && s[left] != '(') left--;
            string inner = s.substr(left + 1, right - left - 1);
            int val = evaluateSimple(inner);
            s = s.substr(0, left) + to_string(val) + s.substr(right + 1);
        }
        return evaluateSimple(s);
    }
};
