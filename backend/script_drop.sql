-- Drop dependent tables first (children → parents order)

-- Drop tables that depend on tblitemvariation (i.e. tblorderitemvariation, tblcartitemvariation)
DROP TABLE IF EXISTS tblorderitemvariation CASCADE;
DROP TABLE IF EXISTS tblcartitemvariation CASCADE;

-- Drop tables that depend on tblorderdetail (i.e. tblorderitemvariation)
DROP TABLE IF EXISTS tblorderdetail CASCADE;

-- Drop tables that depend on tblcartdetail (i.e. tblcartitemvariation)
DROP TABLE IF EXISTS tblcartdetail CASCADE;

-- Drop order and cart tables that depend on tbluser and tblconcession
DROP TABLE IF EXISTS tblorder CASCADE;
DROP TABLE IF EXISTS tblcart CASCADE;

-- Drop feedback and notification tables that depend on tbluser
DROP TABLE IF EXISTS tblfeedback CASCADE;
DROP TABLE IF EXISTS tblnotification CASCADE;

-- Drop the item variation tables
DROP TABLE IF EXISTS tblitemvariation CASCADE;
DROP TABLE IF EXISTS tblitemvariationgroup CASCADE;

-- Drop menu item and concession tables that depend on tblconcession
DROP TABLE IF EXISTS tblmenuitem CASCADE;
DROP TABLE IF EXISTS tblconcession CASCADE;

-- Drop the cafeteria table which is referenced by tblconcession
DROP TABLE IF EXISTS tblcafeteria CASCADE;

-- Finally, drop the user table (as it is referenced by many tables)
DROP TABLE IF EXISTS tbluser CASCADE;
