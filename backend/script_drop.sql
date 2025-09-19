-- Drop dependent tables first (children → parents order)
DROP TABLE IF EXISTS tblorderitemvariation CASCADE;
DROP TABLE IF EXISTS tblorderdetail CASCADE;
DROP TABLE IF EXISTS tblorder CASCADE;

DROP TABLE IF EXISTS tblcartitemvariation CASCADE;
DROP TABLE IF EXISTS tblcartdetail CASCADE;
DROP TABLE IF EXISTS tblcart CASCADE;

DROP TABLE IF EXISTS tblfeedback CASCADE;
DROP TABLE IF EXISTS tblnotification CASCADE;

DROP TABLE IF EXISTS tblitemvariation CASCADE;
DROP TABLE IF EXISTS tblmenuitem CASCADE;
DROP TABLE IF EXISTS tblconcession CASCADE;
DROP TABLE IF EXISTS tblcafeteria CASCADE;
DROP TABLE IF EXISTS tbluser CASCADE;
