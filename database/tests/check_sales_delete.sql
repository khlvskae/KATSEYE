DROP TABLE IF EXISTS pg_temp.sales_delete_results;
CREATE TEMP TABLE sales_delete_results (test TEXT, expected TEXT, result TEXT, detail TEXT);

DO $$
DECLARE
    v_msg  TEXT;
    v_sale TEXT;
    v_cust TEXT;
    v_emp  TEXT;
    v_prod TEXT;
BEGIN
    SELECT custno, empno INTO v_cust, v_emp FROM sales WHERE NOT is_deleted LIMIT 1;
    SELECT prodcode INTO v_prod FROM pricehist WHERE NOT is_deleted LIMIT 1;

    SELECT transno INTO v_sale FROM salesdetail WHERE NOT is_deleted LIMIT 1;
    BEGIN UPDATE sales SET is_deleted = true WHERE transno = v_sale; RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO sales_delete_results VALUES ('Delete sale ' || v_sale || ' (has line items)', 'blocked',
        CASE WHEN v_msg LIKE 'Cannot delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    BEGIN
        INSERT INTO sales (transno, salesdate, custno, empno) VALUES ('TRTEST01', CURRENT_DATE, v_cust, v_emp);
        INSERT INTO payment (orno, paydate, amount, transno) VALUES ('ORTEST01', CURRENT_DATE, 10, 'TRTEST01');
        UPDATE sales SET is_deleted = true WHERE transno = 'TRTEST01';
        RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO sales_delete_results VALUES ('Delete sale that has payments', 'blocked',
        CASE WHEN v_msg LIKE 'Cannot delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    BEGIN
        INSERT INTO sales (transno, salesdate, custno, empno) VALUES ('TRTEST01', CURRENT_DATE, v_cust, v_emp);
        INSERT INTO salesdetail (transno, prodcode, quantity) VALUES ('TRTEST01', v_prod, 1);
        INSERT INTO payment (orno, paydate, amount, transno) VALUES ('ORTEST01', CURRENT_DATE, 10, 'TRTEST01');
        UPDATE salesdetail SET is_deleted = true WHERE transno = 'TRTEST01';
        UPDATE payment     SET is_deleted = true WHERE orno = 'ORTEST01';
        UPDATE sales       SET is_deleted = true WHERE transno = 'TRTEST01';
        RAISE EXCEPTION 'UNDO_OK';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO sales_delete_results VALUES ('Delete sale after deleting its lines and payments', 'allowed',
        CASE WHEN v_msg = 'UNDO_OK' THEN 'PASS' ELSE 'FAIL' END, CASE WHEN v_msg = 'UNDO_OK' THEN 'soft-deleted, then undone' ELSE v_msg END);

    BEGIN
        UPDATE salesdetail SET is_deleted = true WHERE transno = v_sale AND prodcode = (SELECT prodcode FROM salesdetail WHERE transno = v_sale LIMIT 1);
        UPDATE payment SET is_deleted = true WHERE orno = (SELECT orno FROM payment WHERE NOT is_deleted LIMIT 1);
        RAISE EXCEPTION 'UNDO_OK';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO sales_delete_results VALUES ('Delete one line item and one payment', 'allowed',
        CASE WHEN v_msg = 'UNDO_OK' THEN 'PASS' ELSE 'FAIL' END, CASE WHEN v_msg = 'UNDO_OK' THEN 'soft-deleted, then undone' ELSE v_msg END);

    BEGIN UPDATE customer SET is_deleted = true WHERE custno = v_cust; RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO sales_delete_results VALUES ('Delete customer ' || v_cust || ' (has sales)', 'blocked',
        CASE WHEN v_msg LIKE 'Cannot delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    BEGIN UPDATE product SET is_deleted = true WHERE prodcode = v_prod; RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO sales_delete_results VALUES ('Delete product ' || v_prod || ' (has prices/sales)', 'blocked',
        CASE WHEN v_msg LIKE 'Cannot delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    BEGIN DELETE FROM sales WHERE transno = v_sale; RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO sales_delete_results VALUES ('Hard DELETE on sales', 'blocked',
        CASE WHEN v_msg LIKE 'Hard delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);
END;
$$;

SELECT * FROM sales_delete_results;
