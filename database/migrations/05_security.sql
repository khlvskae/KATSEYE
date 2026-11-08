CREATE OR REPLACE FUNCTION trg_check_rights() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_add TEXT;
    v_edit TEXT;
    v_del TEXT;
    v_need TEXT;
BEGIN
    IF current_user NOT IN ('authenticated', 'anon') THEN
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'customer' THEN
        v_add := 'customers.add'; v_edit := 'customers.edit'; v_del := 'customers.delete';
    ELSIF TG_TABLE_NAME = 'product' THEN
        v_add := 'products.add'; v_edit := 'products.edit'; v_del := 'products.delete';
    ELSIF TG_TABLE_NAME = 'pricehist' THEN
        v_add := 'products.priceAdd'; v_edit := 'products.priceEdit'; v_del := 'products.priceDelete';
    ELSIF TG_TABLE_NAME = 'employee' THEN
        v_add := 'hr.empAdd'; v_edit := 'hr.empEdit'; v_del := 'hr.empDelete';
    ELSIF TG_TABLE_NAME = 'job' THEN
        v_add := 'hr.jobAdd'; v_edit := 'hr.jobEdit'; v_del := 'hr.jobDelete';
    ELSIF TG_TABLE_NAME = 'department' THEN
        v_add := 'hr.deptAdd'; v_edit := 'hr.deptEdit'; v_del := 'hr.deptDelete';
    ELSIF TG_TABLE_NAME = 'jobhistory' THEN
        v_add := 'hr.jhAdd'; v_edit := 'hr.jhEdit'; v_del := 'hr.jhDelete';
    ELSIF TG_TABLE_NAME = 'sales' THEN
        v_add := 'sales.add'; v_edit := 'sales.edit'; v_del := 'sales.delete';
    ELSIF TG_TABLE_NAME = 'salesdetail' THEN
        v_add := 'sales.detailAdd'; v_edit := 'sales.detailEdit'; v_del := 'sales.detailDelete';
    ELSIF TG_TABLE_NAME = 'payment' THEN
        v_add := 'sales.add'; v_edit := 'sales.edit'; v_del := 'sales.delete';
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_need := v_add;
    ELSIF NEW.is_deleted <> OLD.is_deleted THEN
        v_need := v_del;
    ELSE
        v_need := v_edit;
    END IF;

    IF NOT has_right(v_need) THEN
        RAISE EXCEPTION 'You do not have the "%" right.', (SELECT label FROM rights WHERE right_code = v_need)
              USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricehist ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE job ENABLE ROW LEVEL SECURITY;
ALTER TABLE department ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobhistory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesdetail ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON customer, product, pricehist, employee, job, department, jobhistory, sales, salesdetail, payment,
              customer_active, product_active, pricehist_active, employee_active, job_active,
              department_active, jobhistory_active, sales_active, salesdetail_active, payment_active
  FROM anon;
GRANT SELECT, INSERT, UPDATE ON customer, product, pricehist, employee, job, department, jobhistory,
                                sales, salesdetail, payment
  TO authenticated;

CREATE POLICY rights_read ON customer FOR ALL TO authenticated
    USING (has_right('customers.view') OR has_right('sales.view') OR has_right('reports.topCustomers'))
    WITH CHECK (true);
CREATE POLICY rights_read ON product FOR ALL TO authenticated
    USING (has_right('products.view') OR has_right('sales.view') OR has_right('reports.productMaster')
           OR has_right('reports.topProducts'))
    WITH CHECK (true);
CREATE POLICY rights_read ON pricehist FOR ALL TO authenticated
    USING (has_right('products.view') OR has_right('sales.view') OR has_right('reports.productMaster')
           OR has_right('reports.topProducts') OR has_right('reports.topSales') OR has_right('reports.topCustomers'))
    WITH CHECK (true);
CREATE POLICY rights_read ON employee FOR ALL TO authenticated
    USING (has_right('hr.view') OR has_right('sales.view') OR has_right('reports.activeEmployees')
           OR has_right('reports.allEmployees') OR has_right('reports.empJobHistory'))
    WITH CHECK (true);
CREATE POLICY rights_read ON job FOR ALL TO authenticated
    USING (has_right('hr.view') OR has_right('reports.activeEmployees') OR has_right('reports.allEmployees')
           OR has_right('reports.empJobHistory'))
    WITH CHECK (true);
CREATE POLICY rights_read ON department FOR ALL TO authenticated
    USING (has_right('hr.view') OR has_right('reports.activeEmployees') OR has_right('reports.allEmployees')
           OR has_right('reports.empJobHistory'))
    WITH CHECK (true);
CREATE POLICY rights_read ON jobhistory FOR ALL TO authenticated
    USING (has_right('hr.jhView') OR has_right('reports.empJobHistory'))
    WITH CHECK (true);
CREATE POLICY rights_read ON sales FOR ALL TO authenticated
    USING (has_right('sales.view') OR has_right('reports.topCustomers') OR has_right('reports.topProducts')
           OR has_right('reports.topSales'))
    WITH CHECK (true);
CREATE POLICY rights_read ON salesdetail FOR ALL TO authenticated
    USING (has_right('sales.detailView') OR has_right('sales.view') OR has_right('reports.topCustomers')
           OR has_right('reports.topProducts') OR has_right('reports.topSales'))
    WITH CHECK (true);
CREATE POLICY rights_read ON payment FOR ALL TO authenticated
    USING (has_right('sales.view'))
    WITH CHECK (true);

CREATE TRIGGER customer_biu_rights BEFORE INSERT OR UPDATE ON customer FOR EACH ROW EXECUTE FUNCTION trg_check_rights();
CREATE TRIGGER product_biu_rights BEFORE INSERT OR UPDATE ON product FOR EACH ROW EXECUTE FUNCTION trg_check_rights();
CREATE TRIGGER pricehist_biu_rights BEFORE INSERT OR UPDATE ON pricehist FOR EACH ROW EXECUTE FUNCTION trg_check_rights();
CREATE TRIGGER employee_biu_rights BEFORE INSERT OR UPDATE ON employee FOR EACH ROW EXECUTE FUNCTION trg_check_rights();
CREATE TRIGGER job_biu_rights BEFORE INSERT OR UPDATE ON job FOR EACH ROW EXECUTE FUNCTION trg_check_rights();
CREATE TRIGGER department_biu_rights BEFORE INSERT OR UPDATE ON department FOR EACH ROW EXECUTE FUNCTION trg_check_rights();
CREATE TRIGGER jobhistory_biu_rights BEFORE INSERT OR UPDATE ON jobhistory FOR EACH ROW EXECUTE FUNCTION trg_check_rights();
CREATE TRIGGER sales_biu_rights BEFORE INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION trg_check_rights();
CREATE TRIGGER salesdetail_biu_rights BEFORE INSERT OR UPDATE ON salesdetail FOR EACH ROW EXECUTE FUNCTION trg_check_rights();
CREATE TRIGGER payment_biu_rights BEFORE INSERT OR UPDATE ON payment FOR EACH ROW EXECUTE FUNCTION trg_check_rights();

ALTER VIEW customer_active SET (security_invoker = true);
ALTER VIEW product_active SET (security_invoker = true);
ALTER VIEW pricehist_active SET (security_invoker = true);
ALTER VIEW employee_active SET (security_invoker = true);
ALTER VIEW job_active SET (security_invoker = true);
ALTER VIEW department_active SET (security_invoker = true);
ALTER VIEW jobhistory_active SET (security_invoker = true);
ALTER VIEW sales_active SET (security_invoker = true);
ALTER VIEW salesdetail_active SET (security_invoker = true);
ALTER VIEW payment_active SET (security_invoker = true);
