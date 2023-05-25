import { calculateTotalPrice } from '../../controller/ordersController'

test("計算兩個陣列的數量回", () => {
    // Arrange
    const a = [
        { productNo: 2, price: 200, qty: 5 },
        { productNo: 4, price: 50, qty: 5 }
    ]
    const b = [
        { productNo: 5, price: 100, qty: 10 },
        { productNo: 6, price: 50, qty: 15 }
    ]
    const discount = 90

    // Act
    const sum = calculateTotalPrice(a, b, discount)

    // Assert
    // (100 *5 +50*5) *0.1
    expect(sum).toBe(75);
});

