const express = require('express');
const mysql = require('mysql2')
const path = require('path')
const favicon = require('serve-favicon')

const db = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: '123456',
})

db.connect((err) => {
   if(err){
      console.error('Erro ao conectar com o mySQL', err)
      return;
   }
   console.log('Conectado ao mySQL!')

   db.query('CREATE DATABASE IF NOT EXISTS to_do_list', (err, results) => {
      if(err){
         console.error('Erro ao criar banco de dados', err)
         return;
      }
      console.log('Banco de dados criado')
   })

   db.query('USE to_do_list', (err) => {
      if(err) {
         console.error('Erro ao selecionar banco de dados', err)
         return;
      }
   })

   const createItemsTable = `
      CREATE TABLE IF NOT EXISTS items (
         id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(255) NOT NULL,
         listId INT,
         FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE CASCADE
      )
   `

   const createListsTable = `
      CREATE TABLE IF NOT EXISTS lists (
         id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(255) NOT NULL UNIQUE
      )
   `

   db.query(createItemsTable, (err) => {
      if(err) {
         console.error('Erro ao criar tabela', err)
      } else {
         console.log('Tabela criada ou já existe.')
      }
   })

   db.query(createListsTable, (err) => {
      if(err) {
         console.error('Erro ao buscar tabela', err)
      } else {
         console.log('Tabela criada ou já existe')
      }
   })
})

const app = express();

app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(express.urlencoded({ extended: true}))
app.use(express.static('public'))


app.get('/', (req, res) => {
   const query = 'SELECT * FROM items WHERE listId IS NULL'

   db.query(query, (err, results) => {
      if(err) {
         console.error('erro ao selecionar tabela', err)
         res.status(500).send('Erro na aplicação')
      } else {
         res.render('list', {listTitle: 'Today', newListItems: results})
      }
   })
});

app.post('/', (req, res) => {
   const itemInput = req.body.newItem
   const listName = req.body.list

   if(itemInput){
      if(listName === "Today"){
         const query = 'INSERT INTO items (name) VALUES (?)'

         db.query(query, [itemInput], (err) => {
            if(err) {
               console.error('Erro ao inserir na tabela', err)
               return res.status(500).send('Erro ao inserir')
            } else {
               res.redirect('/')
            }
         })
      } else {
         const query = 'SELECT id FROM lists WHERE name = ?'

         db.query(query, [listName], (err, results) => {
            if (err) {
               return res.status(500).send('Erro ao encontrar a lista');
            } else {
               const listId = results[0].id;

               const insertQuery = 'INSERT INTO items (name, listId) VALUES (?, ?)';

               db.query(insertQuery, [itemInput, listId], (err) => {
                  if(err) {
                     console.error(err)
                     return res.status(500).send('Erro ao inserir')
                  } else {
                     res.redirect('/' + listName)
                  }
               })
            }
         })
      }
   } else {
      console.error('Item não inserido')
      res.status(500).send('Erro na aplicação')
   }
})

app.post('/delete', (req, res) => {
   const checkboxItemId = req.body.checkbox
   const listName = req.body.listName

   if(listName === 'Today') {
      const query = 'DELETE FROM items WHERE id= ?'

      db.query(query, [checkboxItemId], (err) => {
         if(err) {
            console.error('Erro na aplicação', err)
            return res.status(500).json(err)
         } else {
            res.redirect('/')
         }
      })
   } else {
      const query = 'SELECT * FROM lists WHERE name= ?'

      db.query(query, [listName], (err, results) => {
         if(err) {
            console.error(err)
            return res.status(500).send('Erro ao buscar lista')
         }

         if(results.length !== 0) {
            const listId = results[0].id
            const deleteQuery = 'DELETE FROM items where id= ? AND listId= ?'

            db.query(deleteQuery, [checkboxItemId, listId], (err) => {
               if(err) {
                  console.error(err)
                  return res.status(500).send('Erro ao deletar item da lista personalizada')
               } else {
                  res.redirect('/' + listName)
               }
            })
         } else {
            res.status(404).send('Lista não encontrada')
         }
      })
   }
})

//Rota dinamica expressjs

app.get('/:customListName', (req, res) => {
   const customListName = req.params.customListName

   const query = 'SELECT * FROM lists WHERE name = ?'

   db.query(query, [customListName], (err, results) => {
      if(err) {
         console.log(err)
         return res.status(500).send('Erro na aplicação')
      }
      
      if(results.length === 0) {
         const insertQuery = 'INSERT INTO lists (name) VALUES (?)'

         db.query(insertQuery, [customListName], (err) => {
            if (err) {
               console.error(err)
               return res.status(500).send('erro ao criar a lista')
            } else {
               res.redirect('/' + customListName)
            }
         })
      } else {
         const listId = results[0].id;
         const itemsQuery = 'SELECT * FROM items WHERE listId = ?'

         db.query(itemsQuery, [listId], (err, results) => {
            if(err) {
               console.error(err)
               return res.status(500).send('Erro ao buscar itens')
            } else {
               res.render('list', {listTitle: customListName, newListItems: results})
            }
         })
      }
   })
})

app.listen(4000, () => {
    console.log('Servidor rodando na porta 4000');
});