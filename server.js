const mysql = require('mysql2');
const inquirer = require('inquirer');

require('dotenv').config();

const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'business'
});

con.connect(err => {
    if (err) throw err;
    console.log('Connected as ID: ' + con.threadId);
    begin();
})

const begin = () => {
    inquirer.prompt ([
        {
            type: 'list',
            name: 'start',
            message: 'What would you like to do?',
            choices: [
                'View all departments',
                'View all roles',
                'View all employees',
                'Add a department',
                'Add a role',
                'Add an employee',
                'Update an employee role'
            ]
        }
    ])
    .then(data => {
        if (data.start === 'View all departments'){
            viewDepts();
        } else if (data.start === 'View all roles'){
            viewRoles();
        } else if (data.start === 'View all employees'){
            viewEmployees();
        } else if (data.start === 'Add a department'){
            addDepartment();
        } else if (data.start === 'Add a role'){
            addRole();
        } else if (data.start === 'Add an employee'){
            addEmployee();
        } else if (data.start === 'Update an employee role'){
            updateEmployee();
        }
    })    
};

viewDepts = async () => {
    console.log('Departments \n');
    const sql = `SELECT * FROM departments`;
    const query = await con.promise().query(sql)
    console.table(query[0],['name']);
    begin();
}

viewRoles = async () => {
    console.log('Roles \n')
    const sql = `SELECT roles.*, departments.name
        AS department_name
        FROM roles
        LEFT JOIN departments
        ON roles.department_id = departments.id`;
    const query = await con.promise().query(sql)
    console.table(query[0]);
    begin();
}

viewEmployees = async () => {
    console.log('Employees \n')
    const sql = `SELECT employees.*,
        roles.title AS role_title,
        roles.salary AS role_salary,
        departments.name AS department_name,
        CONCAT (manager.first_name, " ", manager.last_name) AS manager
        FROM employees
        LEFT JOIN roles ON employees.role_id = roles.id
        LEFT JOIN departments ON roles.department_id = departments.id
        LEFT JOIN employees manager ON employees.manager_id = manager.id`;
    const query = await con.promise().query(sql)
    console.table(query[0],['id','first_name','last_name','role_title', 'department_name', 'role_salary','manager']);
    begin();
}

addDepartment = async () => {
    await inquirer.prompt([
        {
        type: 'input',
        name: 'addDept',
        message: 'What is the name of the department you want to add?',
        validate: addDept =>{
            if (addDept) {
                return true;
            } else {
                console.log('Please enter a department');
                return false;
            }
        }
        }
    ])
    .then(data => {
        const sql = `INSERT INTO departments (name)
            VALUES (?)`;
        const query = con.promise().query(sql, data.addDept)
        console.log(data.addDept + ' department has been added.\n')
        viewDepts();
    })
}

addRole = async () => {
    await inquirer.prompt([
        {
        type: 'input',
        name: 'roleName',
        message: 'What is the name of the role you want to add?',
        validate: addRole =>{
            if (addRole) {
                return true;
            } else {
                console.log('Please enter a role.');
                return false;
            }
        }
        },
        {
            type: 'input',
            name: 'roleSalary',
            message: 'What is the salary of the role?',
            validate: roleSalary =>{
                if (roleSalary) {
                    return true;
                } else {
                    console.log('Please enter a role.');
                    return false;
                }
            }
        }
    ])
    .then(data => {
        const params = [data.roleName, data.roleSalary];
        //Get departments array so user can choice from list of available departments
        con.connect(function(err) {
            if (err) throw err;
            con.query("SELECT * FROM departments", function (err, depts) {
                if (err) throw err;
                const deptsArr = depts.map(({id, name}) => {return name});
                inquirer.prompt([
                    {
                        type:'list',
                        name:'roleDept',
                        message: 'Which department does this role belong to?',
                        choices: deptsArr
                    }
                ])
                //add new role with attached department ID to roles table
                .then(answers => {
                    const deptId = depts.filter(depts => depts.name === answers.roleDept)
                    params.push(deptId[0].id)
                    const sqlRole = `INSERT INTO roles (title, salary, department_id)
                        VALUES (?,?,?)`;
                    con.query(sqlRole, params, (err, result) => {
                        if (err) throw err;
                        console.log(data.roleName + ' role has been added.\n')
                        viewRoles();
                    })                
                })
            });
          });
    })
};

addEmployee = async () => {
    await inquirer.prompt([
        {
        type: 'input',
        name: 'emplFirstName',
        message: 'What is the first name of the employee?',
        validate: addEmpl =>{
            if (addEmpl) {
                return true;
            } else {
                console.log('Please enter a name');
                return false;
            }
        }
        },
        {
            type: 'input',
            name: 'emplLastName',
            message: 'What is the last name of the employee?',
            validate: addEmpl =>{
                if (addEmpl) {
                    return true;
                } else {
                    console.log('Please enter a name');
                    return false;
                }
            }
        }
    ])
        .then(data => {
            const params = [data.emplFirstName, data.emplLastName];
            //Get roles array so user can choice from list of available roles
            con.connect(function(err) {
                if (err) throw err;
                con.query(`SELECT * FROM roles`, function (err, roles) {
                    if (err) throw err;
                    const rolesArr = roles.map(({id, title}) => {return title});
                    inquirer.prompt([
                        {
                            type: 'list',
                            name: 'emplRole',
                            message: 'What is the role of the employee?',
                            choices: rolesArr
                        }
                    ])
                    //add new employee with attached role ID to employees table
                    .then(answers => {
                        const roleId = roles.filter(roles => roles.title === answers.emplRole)
                        params.push(roleId[0].id)
                        //get managers to choose from
                        con.connect(function(err){
                            if (err) throw err;
                            con.query('SELECT * FROM employees', function (err, employees) {
                                //CHOOSING FROM EXISTING MANAGERS BELOW... CURRENTLY JUST GOING TO CHOOSE FROM ANY EMPLOYEE
                                // if (err) throw err;
                                // const managerIdArr = employees.map(({id, manager_id}) => {return manager_id});
                                // const managerArr = managerIdArr.filter(Number);
                                // const managerNames = []
                                // for (let i = 0; i < employees.length; i++) {
                                //     if (managerArr.includes(employees[i].id)){
                                //         managerNames.push(employees[i].first_name + ' ' + employees[i].last_name);
                                //         managerObj = managerArr.map(id => ({
                                //             id:id,
                                //             first_name: employees[i].first_name,
                                //             last_name: employees[i].last_name
                                //         }))
                                //     }
                                // }
                                const managers = employees.map(({id, first_name, last_name}) => ({name: first_name + ' ' + last_name, id: id}));
                                inquirer.prompt([
                                    {
                                        type: 'list',
                                        name: 'emplManager',
                                        message: 'Please select the manager for the employee',
                                        choices: managers
                                    }
                                ])
                                .then(managerData => {
                                    for (let i = 0; i< managers.length; i++){
                                        if(managers[i].name === managerData.emplManager){
                                            const managerId = managers[i].id;
                                            params.push(managerId);
                                        }
                                    }
                                const sqlEmpl = `INSERT INTO employees (first_name, last_name, role_id, manager_id)
                                VALUES (?,?,?,?)`;
                                con.query(sqlEmpl, params, (err, result) => {
                                    if (err) throw err;
                                    console.log(data.emplFirstName + ' ' + data.emplLastName + ' has been added.\n')
                                    viewEmployees();
                                })
                            })
                        })

                        })                
                    })
                });
              });
        })
}

updateEmployee = async () => {
    const sql = `SELECT * FROM employees`;
    const employeeList = await con.promise().query(sql);
    const employees = employeeList[0].map(({id, first_name, last_name}) => ({name: first_name + ' ' + last_name, value: id}));
    inquirer.prompt([
        {
            type: 'list',
            name:'name',
            message: 'Which employee would you like to be updated?',
            choices:employees
        }
    ])
    .then(data => {
        const params = [data.name];
        con.connect(function(err) {
            if (err) throw err;
            const sql = `SELECT * FROM roles`
            con.query(sql, function (err, roles) {
                if (err) throw err;
                const rolesArr = roles.map(({id, title}) => {return title});
                inquirer.prompt([
                    {
                        type:'list',
                        name:'empRole',
                        message: 'Which role would you like to update this employee to?',
                        choices: rolesArr
                    }
                ])
                .then(answers => {
                    const empRole = roles.filter(roles => roles.title === answers.empRole)
                    console.log(empRole);
                    params.unshift(empRole[0].id)
                    console.log(params);
                    const sqlRole = `UPDATE employees SET role_id = ?
                        WHERE id = ?`;
                    con.query(sqlRole, params, (err, result) => {
                        if (err) throw err;
                        console.log(data.name + ' has been updated to ' + answers.empRole)
                        viewEmployees();
                    })                
                })
             });
          });

    })
}

