// 导入Jest的断言库
import { expect, test } from '@jest/globals';

// 示例函数：计算两个数字的和
function add(a: number, b: number): number {
    return a + b;
}

// Jest测试代码
test('adds 1 + 2 to equal 3', () => {
    expect(add(1, 2)).toBe(3);
});

test('adds -1 + -1 to equal -2', () => {
    expect(add(-1, -1)).toBe(-2);
});
