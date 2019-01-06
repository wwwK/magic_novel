class EosKnight < ApplicationRecord
  EOSPARK_KEY = "a9564ebc3289b7a14551baf8ad5ec60a"

  enum category: {
      material_sale: 0,
      item_sale: 1,
  }

  class << self

    # 获取数据
    def fetch_data(set_time)
      module_name = "account"
      action = "get_account_related_trx_info"
      account = "eosknightsio"

      page = 1
      flag = true
      while flag
        puts '开始。。。。。。'
        resp = sync_eos_transactions(module_name, action, account, page)

        if resp[:errno] == 0
          resp[:data][:trace_list].each do |trace|
            infos = trace[:memo].split(":")
            if infos.first == "eosknights"

              if EosKnight.find_by(trx_id: trace[:trx_id])
                puts "记录重复，结束！"
                flag = false

                break
              else
                trx_time = Time.parse(trace[:timestamp])

                if trx_time <= set_time
                  puts "达到设定时间，结束！"
                  flag = false

                  break
                end

                category =if infos[1] == "material-sale"
                  :material_sale
                elsif infos[1] == "item-sale"
                  :item_sale
                end

                attrs = {
                    block_num: trace[:block_num],
                    data_md5: trace[:data_md5],
                    trx_id: trace[:trx_id],
                    trx_time: trx_time,
                    receiver: trace[:receiver],
                    sender: trace[:sender],
                    code: trace[:code],
                    quantity: trace[:quantity],
                    symbol: trace[:symbol],
                    status: trace[:status],
                    memo: trace[:memo],
                    category: category,
                    category_id: infos[2],
                    sell_id: infos[3],
                    buyer: infos.last
                }

                EosKnight.create!(attrs)
              end
            end

            print "."
          end
          page +=1
        else
          puts "error"

          # flag = false
        end

        sleep 0.5

      end
    end

    def sync_eos_transactions(module_name, action, account, page=1, size=20, transaction_type=2)
      attrs = {
          module: module_name,
          action: action,
          apikey: EOSPARK_KEY,
          account:account,
          page: page,
          size: size,
          transaction_type: transaction_type
      }

      p "https://api.eospark.com/api?#{attrs.to_query}"
      response = RestClient.get("https://api.eospark.com/api?#{attrs.to_query}")

      HashWithIndifferentAccess.new(JSON(response))
    rescue
      {}
    end
  end
end